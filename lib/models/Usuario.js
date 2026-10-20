/**
 * UTM Desk — Schema Mongoose: Usuario
 * Nivel de acceso guardado como campo nivel_acceso (no rol de MongoDB).
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model, models } = mongoose;

const usuarioSchema = new Schema(
  {
    nombre_completo: { type: String, required: true, trim: true },
    correo: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password_hash: { type: String, required: true, select: false },
    nivel_acceso: {
      type: String,
      enum: ['reportante', 'tecnico', 'coordinador', 'directivo'],
      required: true,
    },
    // Sub-tipo solo aplica y existe para nivel reportante
    tipo_reportante: {
      type: String,
      enum: ['docente', 'estudiante', 'administrativo'],
      required: false,
    },
    estado: {
      type: String,
      enum: ['activo', 'inactivo', 'suspendido'],
      default: 'activo',
    },
    fecha_registro: { type: Date, default: Date.now },
  },
  { collection: 'usuarios', timestamps: false }
);

// Compatibilidad hacia atrás con lecturas de .nombre
usuarioSchema.virtual('nombre').get(function () {
  return this.nombre_completo;
});

// Getter virtual para .activo
usuarioSchema.virtual('activo').get(function () {
  return this.estado === 'activo';
});

// Método para comparar contraseña
usuarioSchema.methods.verificarPassword = async function (password) {
  return bcrypt.compare(password, this.password_hash);
};

// Método para serializar sin datos sensibles (nunca devuelve password_hash ni nulos)
usuarioSchema.methods.toSafeObject = function () {
  const safe = {
    _id: this._id,
    nombre_completo: this.nombre_completo,
    nombre: this.nombre_completo,
    correo: this.correo,
    nivel_acceso: this.nivel_acceso,
    estado: this.estado,
    fecha_registro: this.fecha_registro,
  };
  if (this.nivel_acceso === 'reportante' && this.tipo_reportante) {
    safe.tipo_reportante = this.tipo_reportante;
  }
  return safe;
};

export const Usuario = models.Usuario || model('Usuario', usuarioSchema);
