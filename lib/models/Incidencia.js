/**
 * UTM Desk — Schema Mongoose: Incidencia (docs/requisitos.md sección 5.1)
 * Colección: incidencias_campus
 * TTL: 60 días tras fecha_resolucion (expireAfterSeconds: 5184000)
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

// ── Sub-schema de entrada en la bitácora (historial_seguimiento) ───────────
const entradaHistorialSchema = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    autor: { type: String, required: true },
    estado_nuevo: { type: String, required: true },
    comentario: { type: String, default: '' },
    horas: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ── Sub-schema de evidencia adjunta (evidencias_adjuntas) ───────────────────
const evidenciaAdjuntaSchema = new Schema(
  {
    nombre_archivo: { type: String, required: true },
    tipo_mime: { type: String, required: true },
    peso_kb: { type: Number },
    url_storage: { type: String, required: true },
    fecha_carga: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Sub-schema de técnico asignado ─────────────────────────────────────────
const tecnicoAsignadoSchema = new Schema(
  {
    nombre: { type: String, required: true },
    correo: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: false }
);

// ── Sub-schema de ubicación ───────────────────────────────────────────────
const ubicacionSchema = new Schema(
  {
    edificio: {
      type: String,
      enum: ['Edificio A', 'Edificio B', 'Edificio C', 'Edificio D'],
      required: true,
    },
    piso: { type: Number, min: 0 },
    espacio: { type: String, required: true, trim: true },
  },
  { _id: false }
);

// ── Sub-schema de reportante ───────────────────────────────────────────────
const reportanteSchema = new Schema(
  {
    nombre: { type: String, required: true },
    rol: {
      type: String,
      enum: ['docente', 'estudiante', 'administrativo', 'superadmin'],
      required: true,
    },
    correo: { type: String, required: true, lowercase: true, trim: true },
  },
  { _id: false }
);

// ── Schema principal ───────────────────────────────────────────────────────
const incidenciaSchema = new Schema(
  {
    codigo: {
      type: String,
      unique: true,
      index: { name: 'codigo_unico' },
      required: true,
      match: /^INC-\d{4}-\d{4}$/,
    },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    categoria: {
      type: String,
      enum: ['computo_redes', 'infraestructura', 'academico'],
      required: true,
    },
    prioridad: {
      type: String,
      enum: ['baja', 'media', 'alta', 'critica'],
      required: true,
    },
    estado: {
      type: String,
      enum: ['abierta', 'en_proceso', 'en_espera', 'resuelta', 'cerrada'],
      default: 'abierta',
    },
    reportante: { type: reportanteSchema, required: true },
    ubicacion: { type: ubicacionSchema, required: true },
    tecnico_asignado: { type: tecnicoAsignadoSchema, required: false },
    detalle_especifico: { type: Schema.Types.Mixed, required: true },
    tags: { type: [String], default: [] },
    horas_invertidas: { type: Number, default: 0, min: 0 },
    fecha_creacion: { type: Date, default: Date.now },
    fecha_resolucion: { type: Date, required: false },
    historial_seguimiento: { type: [entradaHistorialSchema], default: [] },
    evidencias_adjuntas: { type: [evidenciaAdjuntaSchema], default: [] },
  },
  { collection: 'incidencias_campus', timestamps: false, versionKey: false }
);

// Compatibilidad hacia atrás con lecturas previas
incidenciaSchema.virtual('bitacora').get(function () {
  return this.historial_seguimiento;
});
incidenciaSchema.virtual('horas_acumuladas').get(function () {
  return this.horas_invertidas;
});
incidenciaSchema.virtual('evidencias').get(function () {
  return this.evidencias_adjuntas;
});

// ── Índices (docs/requisitos.md sección 5.5) ──────────────────────────────
incidenciaSchema.index({ categoria: 1, estado: 1, 'ubicacion.edificio': 1 }, { name: 'idx_tablero_filtros' });
incidenciaSchema.index(
  { titulo: 'text', descripcion: 'text' },
  { default_language: 'spanish', weights: { titulo: 10, descripcion: 5 }, name: 'idx_busqueda_texto' }
);
// RF-23: TTL de 60 días tras fecha_resolucion (60 * 24 * 3600 = 5,184,000 s)
incidenciaSchema.index(
  { fecha_resolucion: 1 },
  { expireAfterSeconds: 5184000, name: 'idx_ttl_60_dias' }
);

export const Incidencia = models.Incidencia || model('Incidencia', incidenciaSchema);
