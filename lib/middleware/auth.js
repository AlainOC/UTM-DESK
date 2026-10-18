/**
 * UTM Desk — Middleware de autenticación JWT + control de nivel_acceso
 */
import jwt from 'jsonwebtoken';

/**
 * Verifica el JWT del header Authorization: Bearer <token>
 * Inyecta req.user = { _id, nombre, correo, nivel_acceso, tipo_reportante }
 */
export function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autenticado. Se requiere token JWT.' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

/**
 * Verifica que el usuario tenga al menos el nivel requerido.
 * Jerarquía: reportante < tecnico < coordinador < directivo
 *
 * Uso: requireNivel('coordinador') → solo coordinador y directivo pasan.
 */
const JERARQUIA = ['reportante', 'tecnico', 'coordinador', 'directivo'];

export function requireNivel(...niveles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }
    const nivelUsuario = req.user.nivel_acceso;
    const indexUsuario = JERARQUIA.indexOf(nivelUsuario);
    const permitido = niveles.some(
      (n) => indexUsuario >= JERARQUIA.indexOf(n)
    );
    if (!permitido) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere nivel: ${niveles.join(' o ')}.`,
      });
    }
    next();
  };
}
