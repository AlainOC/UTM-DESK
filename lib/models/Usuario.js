/**
 * UTM Desk — Schema Mongoose: Usuario
 * Nivel de acceso guardado como campo nivel_acceso (no rol de MongoDB).
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema, model, models } = mongoose;

const usuarioSchema = new Schema(
  {
    nombre: { type: String, required: true, trim: true },
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
    // Sub-tipo solo aplica a nivel reportante
    tipo_reportante: {
      type: String,
      enum: ['docente', 'estudiante', 'administrativo', null],
      default: null,
    },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Método para comparar contraseña
usuarioSchema.methods.verificarPassword = async function (password) {
  return bcrypt.compare(password, this.password_hash);
};

// Método para serializar sin datos sensibles
usuarioSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    nombre: this.nombre,
    correo: this.correo,
    nivel_acceso: this.nivel_acceso,
    tipo_reportante: this.tipo_reportante,
  };
};

export const Usuario = models.Usuario || model('Usuario', usuarioSchema);
