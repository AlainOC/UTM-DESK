/**
 * UTM Desk — Módulo de Autenticación del Frontend
 * Gestiona sesión JWT en sessionStorage, login, logout y estado del usuario.
 */

const SESSION_KEY = 'utm_session';

/** @returns {{ token: string, usuario: object } | null} */
export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** @returns {string | null} Token JWT activo */
export function getToken() {
  return getSession()?.token ?? null;
}

/** @returns {object | null} Datos del usuario { nombre, correo, nivel_acceso, tipo_reportante } */
export function getUsuario() {
  return getSession()?.usuario ?? null;
}

/** @returns {boolean} True si hay sesión activa */
export function isLoggedIn() {
  const session = getSession();
  if (!session?.token) return false;
  // Verificar expiración del JWT (sin validar firma, solo decodificar)
  try {
    const [, payload] = session.token.split('.');
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      sessionStorage.removeItem(SESSION_KEY);
      return false;
    }
  } catch {
    // Si falla la decodificación, asumir inválido
    sessionStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

/**
 * Guarda la sesión tras login exitoso.
 * @param {string} token
 * @param {object} usuario
 */
export function saveSession(token, usuario) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token, usuario }));
}

/** Elimina la sesión (logout) */
export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Verifica si el usuario tiene al menos el nivel requerido.
 * Jerarquía: reportante < tecnico < coordinador < directivo
 * @param {'reportante'|'tecnico'|'coordinador'|'directivo'} nivelMinimo
 */
const JERARQUIA = ['reportante', 'tecnico', 'coordinador', 'directivo'];

export function tieneAcceso(nivelMinimo) {
  const usuario = getUsuario();
  if (!usuario) return false;
  return JERARQUIA.indexOf(usuario.nivel_acceso) >= JERARQUIA.indexOf(nivelMinimo);
}
