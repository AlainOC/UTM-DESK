/**
 * UTM Desk — Configuración y Catálogos Centrales
 * Catálogos fijos y flags de ejecución del frontend.
 */

// Si USE_MOCK es true, todas las llamadas en api.js se resuelven contra el almacén en memoria
export const USE_MOCK = true;

// Lista de edificios del campus universitario
export const EDIFICIOS = [
  "Edificio A",
  "Edificio B",
  "Edificio C",
  "Edificio D"
];

// Categorías del sistema con etiquetas y glifos legibles
export const CATEGORIAS = {
  computo_redes: {
    id: "computo_redes",
    label: "Cómputo y Redes",
    shortLabel: "Redes",
    badgeClass: "cat-computo_redes",
    glyph: "⚡"
  },
  infraestructura: {
    id: "infraestructura",
    label: "Infraestructura",
    shortLabel: "Infra",
    badgeClass: "cat-infraestructura",
    glyph: "🏛"
  },
  academico: {
    id: "academico",
    label: "Plataformas Académicas",
    shortLabel: "Académico",
    badgeClass: "cat-academico",
    glyph: "🎓"
  }
};

// Prioridades con codificación multi-sensorial (color + forma + etiqueta)
export const PRIORIDADES = {
  baja: {
    id: "baja",
    label: "Baja",
    badgeClass: "prio-baja",
    glyph: "●"
  },
  media: {
    id: "media",
    label: "Media",
    badgeClass: "prio-media",
    glyph: "▲"
  },
  alta: {
    id: "alta",
    label: "Alta",
    badgeClass: "prio-alta",
    glyph: "▲▲"
  },
  critica: {
    id: "critica",
    label: "Crítica",
    badgeClass: "prio-critica",
    glyph: "■"
  }
};

// Estados del ciclo de vida de la incidencia
export const ESTADOS = {
  abierta: {
    id: "abierta",
    label: "Abierta",
    badgeClass: "status-abierta",
    glyph: "○"
  },
  en_proceso: {
    id: "en_proceso",
    label: "En proceso",
    badgeClass: "status-en_proceso",
    glyph: "◐"
  },
  en_espera: {
    id: "en_espera",
    label: "En espera",
    badgeClass: "status-en_espera",
    glyph: "⏸"
  },
  resuelta: {
    id: "resuelta",
    label: "Resuelta",
    badgeClass: "status-resuelta",
    glyph: "✓"
  },
  cerrada: {
    id: "cerrada",
    label: "Cerrada",
    badgeClass: "status-cerrada",
    glyph: "✕"
  }
};

// Roles de reportante válidos
export const ROLES_REPORTANTE = {
  docente: "Docente",
  estudiante: "Estudiante",
  administrativo: "Personal Administrativo"
};

// Niveles de riesgo para infraestructura
export const NIVELES_RIESGO = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto"
};
