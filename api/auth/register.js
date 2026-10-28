/**
 * POST /api/auth/register
 * RF-01: Registro público de cuentas de reportante.
 * Body: { nombre_completo (o nombre), correo, password, tipo_reportante (o tipo) }
 * Respuesta: 201 { _id, nombre_completo, correo, nivel_acceso, tipo_reportante, estado, fecha_registro }
 * Nunca devuelve password_hash.
 */
import 'dotenv/config';
import express from 'express';
import { connectDB } from '../../lib/db.js';
import { registrarCuentaReportante } from '../../lib/services/usuarioService.js';

const app = express();
app.use(express.json());

app.post(['/api/auth/register', '/api/auth/registro'], async (req, res) => {
  try {
    await connectDB();
    const { nombre_completo, nombre, correo, password, tipo_reportante, tipo } = req.body || {};

    const nuevoUsuario = await registrarCuentaReportante({
      nombre_completo,
      nombre,
      correo,
      password,
      tipo_reportante,
      tipo,
    });

    return res.status(201).json(nuevoUsuario);
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    // Si viene error de índice único de Mongo (E11000)
    if (err.code === 11000) {
      return res.status(409).json({ error: 'El correo institucional ya se encuentra registrado.' });
    }
    console.error('[POST /api/auth/register]', err);
    return res.status(500).json({ error: 'Error interno del servidor al registrar la cuenta.' });
  }
});

export default app;
