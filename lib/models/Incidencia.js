/**
 * UTM Desk — Schema Mongoose: Incidencia
 * Esquema polimórfico estricto por categoría.
 * TTL: el backend elimina documentos 60 días después de fecha_resolucion.
 */
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

// ── Sub-schemas de detalle_especifico por categoría ────────────────────────

const detalleComputoredes = new Schema(
  {
    tipo_falla: { type: String, required: true },
    equipo: { type: String, required: true },
    direccion_ip: {
      type: String,
      required: true,
      match: /^(\d{1,3}\.){3}\d{1,3}$/,
    },
    vlan: { type: Number, required: true, min: 1, max: 4094 },
    puerto_uplink: { type: String, required: true },
    equipos_afectados: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const detalleInfraestructura = new Schema(
  {
    tipo_dano: { type: String, required: true },
    riesgo_seguridad: {
      type: String,
      enum: ['bajo', 'medio', 'alto'],
      required: true,
    },
    insumos_requeridos: { type: [String], default: [] },
    requiere_contratista: { type: Boolean, default: false },
    contratista: { type: String, default: null },
  },
  { _id: false }
);

const detalleAcademico = new Schema(
  {
    plataforma: { type: String, required: true },
    codigo_curso: { type: String, required: true },
    periodo_escolar: { type: String, required: true },
    estudiantes_impactados: { type: Number, required: true, min: 0 },
    mensaje_error: { type: String, required: true },
  },
  { _id: false }
);

// ── Sub-schema de entrada en la bitácora ───────────────────────────────────

const bitacoraEntrada = new Schema(
  {
    fecha: { type: Date, default: Date.now },
    autor: { type: String, required: true },
    estado_anterior: { type: String },
    estado_nuevo: { type: String, required: true },
    comentario: { type: String, default: '' },
    horas: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

// ── Sub-schema de evidencia ────────────────────────────────────────────────

const evidenciaSchema = new Schema(
  {
    nombre_archivo: { type: String, required: true },
    tipo_mime: { type: String, required: true },
    peso_kb: { type: Number },
    url_storage: { type: String, required: true },
    fecha_subida: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ── Schema principal ───────────────────────────────────────────────────────

const incidenciaSchema = new Schema(
  {
    codigo: {
      type: String,
      unique: true,
      // formato: INC-AAAA-NNNN (generado por el backend)
    },
    titulo: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true },
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
    reportante: {
      nombre: { type: String, required: true },
      correo: { type: String, required: true },
      rol: {
        type: String,
        enum: ['docente', 'estudiante', 'administrativo'],
        required: true,
      },
    },
    ubicacion: {
      edificio: { type: String, required: true },
      salon: { type: String },
      descripcion_adicional: { type: String },
    },
    detalle_especifico: { type: Schema.Types.Mixed, required: true },
    tecnico_asignado: { type: String, default: null },
    bitacora: { type: [bitacoraEntrada], default: [] },
    horas_acumuladas: { type: Number, default: 0 },
    tags: { type: [String], default: [] },
    evidencias: { type: [evidenciaSchema], default: [] },
    fecha_creacion: { type: Date, default: Date.now },
    fecha_resolucion: { type: Date, default: null },
    // TTL index: Mongoose eliminará el doc 60 días después de fecha_resolucion
    expira_en: { type: Date, index: { expireAfterSeconds: 0 }, default: null },
  },
  { timestamps: true }
);

// ── Índices ────────────────────────────────────────────────────────────────
incidenciaSchema.index({ categoria: 1, estado: 1, prioridad: 1 });
incidenciaSchema.index({ fecha_creacion: -1 });
incidenciaSchema.index({ 'ubicacion.edificio': 1 });
incidenciaSchema.index({ titulo: 'text', descripcion: 'text', tags: 'text' });

// ── Contador auto-incremental para código INC-AAAA-NNNN ───────────────────
incidenciaSchema.pre('save', async function (next) {
  if (this.isNew && !this.codigo) {
    const year = new Date().getFullYear();
    const count = await this.constructor.countDocuments({
      codigo: { $regex: `^INC-${year}-` },
    });
    const seq = String(count + 1).padStart(4, '0');
    this.codigo = `INC-${year}-${seq}`;
  }
  next();
});

// ── Al resolverse/cerrarse, setea fecha_resolucion y expira_en ────────────
incidenciaSchema.pre('save', function (next) {
  if (
    this.isModified('estado') &&
    (this.estado === 'resuelta' || this.estado === 'cerrada') &&
    !this.fecha_resolucion
  ) {
    this.fecha_resolucion = new Date();
    // TTL: eliminar 60 días después
    this.expira_en = new Date(
      this.fecha_resolucion.getTime() + 60 * 24 * 60 * 60 * 1000
    );
  }
  next();
});

export const Incidencia =
  models.Incidencia || model('Incidencia', incidenciaSchema);
