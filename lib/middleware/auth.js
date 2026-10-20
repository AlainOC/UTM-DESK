/**
 * UTM Desk — Middleware de autenticación JWT + control de roles (RF-03, RNF-08)
 */
import jwt from 'jsonwebtoken';
import { connectDB } from '../db.js';
import { buscarUsuarioPorCorreo } from '../services/usuarioService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'utm_desk_secret_key_default_32chars_long';

/**
 * RF-03 / RNF-08: Verifica el JWT del header Authorization: Bearer <token>
 * Valida la firma Y consulta el estado de la cuenta en cada petición protegida,
 * de modo que suspender o inactivar una cuenta surta efecto inmediato.
 * Inyecta req.user = { _id, nombre, nombre_completo, correo, nivel_acceso, tipo_reportante, estado }
 */
export async function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Se requiere token JWT.' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'No autenticado. Se requiere token JWT.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    await connectDB();

    // Consulta de estado de la cuenta en la base de datos en cada petición
    const usuario = await buscarUsuarioPorCorreo(payload.correo);
    if (!usuario) {
      return res.status(401).json({ error: 'Cuenta no encontrada o revocada.' });
    }

    if (usuario.estado !== 'activo') {
      return res.status(401).json({ error: 'Cuenta inactiva o suspendida.' });
    }

    req.user = {
      _id: String(usuario._id),
      nombre: usuario.nombre_completo || usuario.nombre,
      nombre_completo: usuario.nombre_completo || usuario.nombre,
      correo: usuario.correo,
      nivel_acceso: usuario.nivel_acceso,
      tipo_reportante: usuario.tipo_reportante,
      estado: usuario.estado,
    };

    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

export const requiereAutenticacion = requireAuth;

/**
 * RF-03 / Matriz de Permisos: Verifica que el usuario tenga alguno de los roles permitidos.
 * No utiliza jerarquía lineal para respetar la matriz estricta de permisos.
 *
 * Uso: requiereRol('tecnico', 'coordinador')
 */
export function requiereRol(...niveles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    const rolUsuario = req.user.nivel_acceso;
    if (!niveles.includes(rolUsuario)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere nivel de acceso: ${niveles.join(' o ')}.`,
      });
    }

    next();
  };
}

export const requireRol = requiereRol;
export const requireNivel = requiereRol;

