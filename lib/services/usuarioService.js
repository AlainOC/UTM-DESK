/**
 * UTM Desk — Servicio de Usuarios y Acceso
 * Capa de servicio para registro, autenticación y consulta de cuentas.
 * Opera contra MongoDB Atlas (Mongoose) o sobre memoryStore en desarrollo local.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isConnectedToAtlas, isMemoryDbActive } from '../db.js';
import { Usuario } from '../models/Usuario.js';
import { memoryStore } from '../memoryFallback.js';

const JWT_EXPIRATION = '8h';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('FATAL: Falta la variable de entorno obligatoria JWT_SECRET.');
  }
  return secret;
}

/**
 * Busca un usuario por correo institucional (case-insensitive).
 */
export async function buscarUsuarioPorCorreo(correo, conPasswordHash = false) {
  const emailNorm = (correo || '').toLowerCase().trim();
  if (isConnectedToAtlas()) {
    const q = Usuario.findOne({ correo: emailNorm });
    if (conPasswordHash) q.select('+password_hash');
    return await q.exec();
  }

  if (!isMemoryDbActive()) {
    const err = new Error('Base de datos MongoDB no disponible y USE_MEMORY_DB no está activo.');
    err.status = 500;
    throw err;
  }

  const u = memoryStore.usuarios.find((user) => user.correo.toLowerCase() === emailNorm);
  if (!u) return null;
  return {
    ...u,
    verificarPassword: async (pwd) => bcrypt.compare(pwd, u.password_hash),
    toSafeObject: () => {
      const safe = {
        _id: u._id,
        nombre_completo: u.nombre_completo,
        nombre: u.nombre_completo,
        correo: u.correo,
        nivel_acceso: u.nivel_acceso,
        estado: u.estado,
        fecha_registro: u.fecha_registro,
      };
      if (u.nivel_acceso === 'reportante' && u.tipo_reportante) {
        safe.tipo_reportante = u.tipo_reportante;
      }
      return safe;
    },
  };
}

/**
 * Busca un usuario por su ID.
 */
export async function buscarUsuarioPorId(id) {
  if (isConnectedToAtlas()) {
    return await Usuario.findById(id).lean();
  }
  if (!isMemoryDbActive()) {
    const err = new Error('Base de datos MongoDB no disponible y USE_MEMORY_DB no está activo.');
    err.status = 500;
    throw err;
  }
  const u = memoryStore.usuarios.find((user) => String(user._id) === String(id));
  return u ? { ...u } : null;
}

/**
 * RF-01: Registro público de cuentas.
 * La cuenta se crea SIEMPRE con nivel_acceso: "reportante" y estado: "activo" fijados por el servidor.
 * Ignora cualquier nivel_acceso o estado proveniente del cliente.
 */
export async function registrarCuentaReportante({ nombre_completo, nombre, correo, password, tipo_reportante, tipo }) {
  const nombreFinal = (nombre_completo || nombre || '').trim();
  const correoFinal = (correo || '').toLowerCase().trim();
  const tipoFinal = tipo_reportante || tipo;

  if (!nombreFinal) {
    const err = new Error('El nombre completo es obligatorio.');
    err.status = 400;
    throw err;
  }

  if (!correoFinal || !correoFinal.includes('@')) {
    const err = new Error('Correo institucional inválido.');
    err.status = 400;
    throw err;
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    const err = new Error('La contraseña debe tener al menos 8 caracteres.');
    err.status = 400;
    throw err;
  }

  const tiposPermitidos = ['docente', 'estudiante', 'administrativo'];
  if (!tipoFinal || !tiposPermitidos.includes(tipoFinal)) {
    const err = new Error(`El tipo de reportante debe ser uno de: ${tiposPermitidos.join(', ')}.`);
    err.status = 400;
    throw err;
  }

  // Verificar si ya existe el correo
  const existente = await buscarUsuarioPorCorreo(correoFinal);
  if (existente) {
    const err = new Error('El correo institucional ya se encuentra registrado.');
    err.status = 409;
    throw err;
  }

  // Hash con bcrypt
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  const nuevoUsuario = {
    nombre_completo: nombreFinal,
    correo: correoFinal,
    password_hash: hash,
    nivel_acceso: 'reportante', // Fijo por el servidor
    tipo_reportante: tipoFinal,
    estado: 'activo', // Fijo por el servidor
    fecha_registro: new Date(),
  };

  if (isConnectedToAtlas()) {
    const creado = await Usuario.create(nuevoUsuario);
    return creado.toSafeObject();
  }

  if (!isMemoryDbActive()) {
    const err = new Error('Base de datos MongoDB no disponible y USE_MEMORY_DB no está activo.');
    err.status = 500;
    throw err;
  }

  nuevoUsuario._id = `usr-${Date.now()}`;
  nuevoUsuario.nombre = nombreFinal;
  memoryStore.usuarios.push(nuevoUsuario);

  const safe = {
    _id: nuevoUsuario._id,
    nombre_completo: nuevoUsuario.nombre_completo,
    nombre: nuevoUsuario.nombre_completo,
    correo: nuevoUsuario.correo,
    nivel_acceso: nuevoUsuario.nivel_acceso,
    tipo_reportante: nuevoUsuario.tipo_reportante,
    estado: nuevoUsuario.estado,
    fecha_registro: nuevoUsuario.fecha_registro,
  };
  return safe;
}

/**
 * RF-02: Inicio de sesión.
 * Devuelve JWT firmado de 8 horas con identificador, correo y nivel de acceso.
 * Rechaza credenciales incorrectas con mensaje genérico y rechaza cuentas inactivas o suspendidas.
 */
export async function iniciarSesion(correo, password) {
  if (!correo || !password) {
    const err = new Error('Correo y contraseña son requeridos.');
    err.status = 400;
    throw err;
  }

  const usuario = await buscarUsuarioPorCorreo(correo, true);
  if (!usuario) {
    const err = new Error('Credenciales incorrectas.');
    err.status = 401;
    throw err;
  }

  // Rechazar cuentas no activas (inactivo o suspendido) con mensaje genérico
  if (usuario.estado !== 'activo') {
    const err = new Error('Credenciales incorrectas.');
    err.status = 401;
    throw err;
  }

  const valido = await usuario.verificarPassword(password);
  if (!valido) {
    const err = new Error('Credenciales incorrectas.');
    err.status = 401;
    throw err;
  }

  const tokenPayload = {
    _id: String(usuario._id),
    correo: usuario.correo,
    nivel_acceso: usuario.nivel_acceso,
    nombre: usuario.nombre_completo || usuario.nombre,
    nombre_completo: usuario.nombre_completo || usuario.nombre,
  };
  if (usuario.nivel_acceso === 'reportante' && usuario.tipo_reportante) {
    tokenPayload.tipo_reportante = usuario.tipo_reportante;
  }

  const token = jwt.sign(tokenPayload, getJwtSecret(), { expiresIn: JWT_EXPIRATION });
  const safeUser = typeof usuario.toSafeObject === 'function' ? usuario.toSafeObject() : {
    _id: usuario._id,
    nombre_completo: usuario.nombre_completo,
    nombre: usuario.nombre_completo,
    correo: usuario.correo,
    nivel_acceso: usuario.nivel_acceso,
    tipo_reportante: usuario.tipo_reportante,
    estado: usuario.estado,
  };

  return { token, usuario: safeUser };
}

/**
 * Valida que un técnico exista en `usuarios`, tenga rol `tecnico` y esté `activo`.
 * Retorna { nombre, correo } para guardar como subdocumento (RF-14).
 */
export async function validarTecnicoParaAsignacion(correoTecnico) {
  const usuario = await buscarUsuarioPorCorreo(correoTecnico);
  if (!usuario) {
    const err = new Error(`El técnico con correo '${correoTecnico}' no existe en el sistema.`);
    err.status = 400;
    throw err;
  }

  if (usuario.nivel_acceso !== 'tecnico') {
    const err = new Error(`El usuario '${correoTecnico}' no tiene rol de técnico.`);
    err.status = 400;
    throw err;
  }

  if (usuario.estado !== 'activo') {
    const err = new Error(`El técnico '${correoTecnico}' no está activo.`);
    err.status = 400;
    throw err;
  }

  return {
    nombre: usuario.nombre_completo || usuario.nombre,
    correo: usuario.correo,
  };
}
